import { File } from './types';

export function getFileKey(file: File, directory?: string): string {
  const filePath = file.path ? `${file.path}/` : '';
  const fileName = `${file.hash}${file.ext}`;

  if (directory) {
    return `${directory.replace(/^\/?|\/?$/g, '')}/${filePath}${fileName}`;
  }

  return `${filePath}${fileName}`;
}

export function getFileUrl({
  file,
  cdn,
  bucket,
  endpoint,
}: {
  file: File;
  cdn?: string;
  bucket?: string;
  endpoint?: string;
}): string {
  if (cdn) {
    return `${cdn.replace(/\/$/, '')}/${getFileKey(file)}`;
  }

  if (!bucket || !endpoint) {
    throw new Error('Bucket and endpoint are required');
  }

  return `https://${bucket}.${endpoint.replace(/^https?:\/\//, '')}/${getFileKey(file)}`;
}
