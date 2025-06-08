import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
  } = providerOptions;

  const s3Client = new S3Client({
    endpoint,
    forcePathStyle: false,
    region,
    credentials,
  });

  return {
    async upload(file: File, customParams = {}): Promise<File> {
      const fileKey = getFileKey(file, directory);

      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mime,
            ACL,
            ...customParams,
          })
        );

        file.url = getFileUrl({
          file,
          cdn,
          bucket,
          directory,
          endpoint,
        });

        return {
          ...file,
          provider_metadata: {
            bucket,
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

    async uploadStream(file: File, customParams = {}): Promise<File> {
      if (!file.stream) {
        throw new Error('File stream is required');
      }

      // Convert stream to buffer for S3 upload
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        if (!file.stream) {
          throw new Error('File stream is required');
        }

        file.stream
          .on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
          .on('error', (err: Error) => reject(err))
          .on('end', async () => {
            file.buffer = Buffer.concat(chunks);
            try {
              const result = await this.upload(file, customParams);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
      });
    },

    async delete(file: File, customParams = {}): Promise<void> {
      const fileKey =
        file.provider_metadata?.key || getFileKey(file, directory);

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            ...customParams,
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

      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: fileKey,
        });

        // Default expiration is 15 minutes (900 seconds)
        const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

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
