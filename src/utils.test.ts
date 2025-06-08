import { describe, it, expect } from 'vitest';
import { getFileKey, getFileUrl } from './utils';
import type { File } from './types';

describe('getFileKey', () => {
  const mockFile: File = {
    hash: 'abc123',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 1024,
  };

  it('should return the correct file key without directory', () => {
    const result = getFileKey(mockFile);
    expect(result).toBe('abc123.jpg');
  });

  it('should return the correct file key with directory', () => {
    const result = getFileKey(mockFile, 'uploads');
    expect(result).toBe('uploads/abc123.jpg');
  });

  it('should handle directory with leading slash', () => {
    const result = getFileKey(mockFile, '/uploads');
    expect(result).toBe('uploads/abc123.jpg');
  });

  it('should handle directory with trailing slash', () => {
    const result = getFileKey(mockFile, 'uploads/');
    expect(result).toBe('uploads/abc123.jpg');
  });

  it('should handle directory with both leading and trailing slashes', () => {
    const result = getFileKey(mockFile, '/uploads/');
    expect(result).toBe('uploads/abc123.jpg');
  });

  it('should include file path if present', () => {
    const fileWithPath: File = {
      ...mockFile,
      path: 'images',
    };
    const result = getFileKey(fileWithPath);
    expect(result).toBe('images/abc123.jpg');
  });

  it('should combine directory and file path correctly', () => {
    const fileWithPath: File = {
      ...mockFile,
      path: 'images',
    };
    const result = getFileKey(fileWithPath, 'uploads');
    expect(result).toBe('uploads/images/abc123.jpg');
  });
});

describe('getFileUrl', () => {
  const mockFile: File = {
    hash: 'abc123',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 1024,
  };

  it('should throw an error if bucket is not provided', () => {
    expect(() =>
      getFileUrl({
        file: mockFile,
        endpoint: 'example.com',
      })
    ).toThrow('Bucket and endpoint are required');
  });

  it('should throw an error if endpoint is not provided', () => {
    expect(() =>
      getFileUrl({
        file: mockFile,
        bucket: 'my-bucket',
      })
    ).toThrow('Bucket and endpoint are required');
  });

  it('should return the correct URL with bucket and endpoint', () => {
    const result = getFileUrl({
      file: mockFile,
      bucket: 'my-bucket',
      endpoint: 'example.com',
    });
    expect(result).toBe('https://my-bucket.example.com/abc123.jpg');
  });

  it('should handle endpoint with protocol', () => {
    const result = getFileUrl({
      file: mockFile,
      bucket: 'my-bucket',
      endpoint: 'https://example.com',
    });
    expect(result).toBe('https://my-bucket.example.com/abc123.jpg');
  });

  it('should use CDN URL when provided', () => {
    const result = getFileUrl({
      file: mockFile,
      bucket: 'my-bucket',
      endpoint: 'example.com',
      cdn: 'https://cdn.example.com',
    });
    expect(result).toBe('https://cdn.example.com/abc123.jpg');
  });

  it('should handle CDN URL with trailing slash', () => {
    const result = getFileUrl({
      file: mockFile,
      bucket: 'my-bucket',
      endpoint: 'example.com',
      cdn: 'https://cdn.example.com/',
    });
    expect(result).toBe('https://cdn.example.com/abc123.jpg');
  });

  it('should include directory in the URL when provided', () => {
    const result = getFileUrl({
      file: mockFile,
      bucket: 'my-bucket',
      endpoint: 'example.com',
      directory: 'uploads',
    });
    expect(result).toBe('https://my-bucket.example.com/uploads/abc123.jpg');
  });

  it('should include file path in the URL when present', () => {
    const fileWithPath: File = {
      ...mockFile,
      path: 'images',
    };
    const result = getFileUrl({
      file: fileWithPath,
      bucket: 'my-bucket',
      endpoint: 'example.com',
    });
    expect(result).toBe('https://my-bucket.example.com/images/abc123.jpg');
  });

  it('should combine directory and file path correctly in the URL', () => {
    const fileWithPath: File = {
      ...mockFile,
      path: 'images',
    };
    const result = getFileUrl({
      file: fileWithPath,
      bucket: 'my-bucket',
      endpoint: 'example.com',
      directory: 'uploads',
    });
    expect(result).toBe(
      'https://my-bucket.example.com/uploads/images/abc123.jpg'
    );
  });

  it('should use CDN URL with directory and file path when all provided', () => {
    const fileWithPath: File = {
      ...mockFile,
      path: 'images',
    };
    const result = getFileUrl({
      file: fileWithPath,
      bucket: 'my-bucket',
      endpoint: 'example.com',
      directory: 'uploads',
      cdn: 'https://cdn.example.com',
    });
    expect(result).toBe('https://cdn.example.com/uploads/images/abc123.jpg');
  });
});
