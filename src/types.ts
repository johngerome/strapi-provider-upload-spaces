import type { ObjectCannedACL } from '@aws-sdk/client-s3';

export type ProviderOptions = {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint: string;
  region?: string;
  bucket: string;
  directory?: string;
  cdn?: string;
  ACL?: ObjectCannedACL;
};

export type FileMetadata = {
  key: string;
  bucket: string;
  region: string;
};

export type File = {
  path?: string;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
  url?: string;
  provider_metadata?: FileMetadata;
};
