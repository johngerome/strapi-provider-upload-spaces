import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl as generatePresignedUrl } from '@aws-sdk/s3-request-presigner';
import { File, ProviderOptions } from './types';
import { getFileKey, getFileUrl } from './utils';

export function init(providerOptions: ProviderOptions) {
  const {
    credentials,
    endpoint,
    region = 'us-east-1',
    bucket,
    directory = '',
    cdn,
    ACL = 'public-read',
    signedUrlExpires = 900,
  } = providerOptions;

  const s3Client = new S3Client({
    endpoint,
    forcePathStyle: false,
    region,
    credentials,
  });

  return {
    async upload(file: File, customParams?: object): Promise<File> {
      const fileKey =
        file.provider_metadata?.key || getFileKey(file, directory);
      const targetBucket = file.provider_metadata?.bucket || bucket;

      try {
        await s3Client.send(
          new PutObjectCommand({
            ...customParams,
            Bucket: targetBucket,
            Key: fileKey,
            // Prefer stream if present (e.g. called from uploadStream),
            // fall back to buffer for direct uploads.
            Body: file.stream ?? file.buffer,
            ContentType: file.mime,
            ACL: ACL as ObjectCannedACL,
          })
        );

        const url = getFileUrl({ file, cdn, bucket, directory, endpoint });
        return {
          ...file,
          url,
          provider_metadata: {
            bucket: targetBucket,
            key: fileKey,
            region,
          },
        };
      } catch (error) {
        throw new Error(
          `Error uploading file to DigitalOcean Spaces: ${error}`
        );
      }
    },

    async uploadStream(file: File, customParams?: object): Promise<File> {
      if (!file.stream) {
        throw new Error('File stream is required');
      }

      // Pass the stream directly to upload(); PutObjectCommand.Body accepts
      // Readable, so the AWS SDK pipes the data without buffering the entire
      // file into memory. stream.destroy() on failure is handled by the SDK.
      return this.upload(file, customParams);
    },

    async delete(file: File, customParams?: object): Promise<void> {
      const fileKey =
        file.provider_metadata?.key || getFileKey(file, directory);
      const targetBucket = file.provider_metadata?.bucket || bucket;

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            ...customParams,
            Bucket: targetBucket,
            Key: fileKey,
          })
        );
      } catch (error) {
        throw new Error(
          `Error deleting file from DigitalOcean Spaces: ${error}`
        );
      }
    },

    async checkFileSize(
      file: File,
      { sizeLimit }: { sizeLimit: number }
    ): Promise<void> {
      if (file.size > sizeLimit) {
        throw new Error(`File size exceeds limit: ${file.size} > ${sizeLimit}`);
      }
    },

    async getSignedUrl(file: File): Promise<{ url: string }> {
      const fileKey =
        file.provider_metadata?.key || getFileKey(file, directory);
      const targetBucket = file.provider_metadata?.bucket || bucket;

      try {
        const command = new GetObjectCommand({
          Bucket: targetBucket,
          Key: fileKey,
        });
        const url = await generatePresignedUrl(s3Client, command, {
          expiresIn: signedUrlExpires,
        });
        return { url };
      } catch (error) {
        throw new Error(`Error generating signed URL: ${error}`);
      }
    },

    async isPrivate(): Promise<boolean> {
      return ACL === 'private';
    },
  };
}
