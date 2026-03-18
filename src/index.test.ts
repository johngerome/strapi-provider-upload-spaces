import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';

const { mockSend, mockGeneratePresignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGeneratePresignedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn().mockImplementation(input => ({ input })),
  DeleteObjectCommand: vi.fn().mockImplementation(input => ({ input })),
  GetObjectCommand: vi.fn().mockImplementation(input => ({ input })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGeneratePresignedUrl,
}));

vi.mock('@strapi/utils', () => ({
  errors: {
    PayloadTooLargeError: class PayloadTooLargeError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'PayloadTooLargeError';
      }
    },
    ForbiddenError: class ForbiddenError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ForbiddenError';
      }
    },
  },
}));

vi.mock('./utils', () => ({
  getFileKey: vi.fn().mockReturnValue('dir/file.jpg'),
  getFileUrl: vi.fn().mockReturnValue('https://cdn.example.com/dir/file.jpg'),
}));

import { init } from './index';
import { getFileKey, getFileUrl } from './utils';
import type { File, FileMetadata } from './types';

const baseOptions = {
  credentials: { accessKeyId: 'KEY', secretAccessKey: 'SECRET' },
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  region: 'us-east-1',
  bucket: 'my-bucket',
  directory: 'uploads',
  ACL: 'public-read',
  signedUrlExpires: 900,
};

const makeMetadata = (overrides: Partial<FileMetadata> = {}): FileMetadata => ({
  key: 'dir/file.jpg',
  bucket: 'my-bucket',
  region: 'us-east-1',
  ...overrides,
});

const makeFile = (overrides: Partial<File> = {}): File => ({
  hash: 'abc123',
  ext: '.jpg',
  mime: 'image/jpeg',
  size: 100,
  buffer: Buffer.from('file content'),
  url: '',
  ...overrides,
});

describe('init', () => {
  it('returns all expected methods', () => {
    const provider = init(baseOptions);
    expect(provider).toHaveProperty('upload');
    expect(provider).toHaveProperty('uploadStream');
    expect(provider).toHaveProperty('delete');
    expect(provider).toHaveProperty('checkFileSize');
    expect(provider).toHaveProperty('getSignedUrl');
    expect(provider).toHaveProperty('isPrivate');
  });
});

describe('upload', () => {
  beforeEach(() => {
    mockSend.mockReset();
    vi.mocked(getFileUrl).mockReturnValue(
      'https://cdn.example.com/dir/file.jpg'
    );
  });

  it('uploads a buffer file and returns enriched File', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);

    const result = await provider.upload(makeFile());

    expect(mockSend).toHaveBeenCalledOnce();
    expect(result.url).toBe('https://cdn.example.com/dir/file.jpg');
    expect(result.provider_metadata).toEqual({
      bucket: 'my-bucket',
      key: 'dir/file.jpg',
      region: 'us-east-1',
    });
  });

  it('uses provider_metadata.key and bucket when present', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);
    const file = makeFile({
      provider_metadata: makeMetadata({
        key: 'custom/key.jpg',
        bucket: 'other-bucket',
      }),
    });

    await provider.upload(file);

    const [command] = mockSend.mock.calls[0];
    expect(command.input.Key).toBe('custom/key.jpg');
    expect(command.input.Bucket).toBe('other-bucket');
    expect(vi.mocked(getFileUrl)).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'other-bucket' })
    );
  });

  it('derives key from getFileKey when provider_metadata is absent', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);
    const file = makeFile();

    await provider.upload(file);

    expect(getFileKey).toHaveBeenCalledWith(file, 'uploads');
    const [command] = mockSend.mock.calls[0];
    expect(command.input.Key).toBe('dir/file.jpg');
  });

  it('uses file.stream as Body when stream is present', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);
    const stream = Readable.from(['data']);
    const file = makeFile({ stream, buffer: undefined });

    await provider.upload(file);

    const [command] = mockSend.mock.calls[0];
    expect(command.input.Body).toBe(stream);
  });

  it('falls back to file.buffer as Body when stream is absent', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);
    const file = makeFile();

    await provider.upload(file);

    const [command] = mockSend.mock.calls[0];
    expect(command.input.Body).toBe(file.buffer);
  });

  it('spreads customParams into PutObjectCommand', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);

    await provider.upload(makeFile(), { ServerSideEncryption: 'AES256' });

    const [command] = mockSend.mock.calls[0];
    expect(command.input.ServerSideEncryption).toBe('AES256');
  });

  it('sends undefined Body and propagates SDK error when both stream and buffer are absent', async () => {
    mockSend.mockRejectedValueOnce(new Error('Missing body'));
    const provider = init(baseOptions);
    const file = makeFile({ buffer: undefined, stream: undefined });

    const error = await provider.upload(file).catch(e => e);

    const [command] = mockSend.mock.calls[0];
    expect(command.input.Body).toBeUndefined();
    expect(error.message).toMatch(
      'Error uploading file to DigitalOcean Spaces'
    );
  });

  it('throws a generic Error when s3Client.send fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network error'));
    const provider = init(baseOptions);

    await expect(provider.upload(makeFile())).rejects.toThrow(
      'Error uploading file to DigitalOcean Spaces'
    );
  });
});

describe('uploadStream', () => {
  beforeEach(() => mockSend.mockReset());

  it('throws if file.stream is missing', async () => {
    const provider = init(baseOptions);

    await expect(provider.uploadStream(makeFile())).rejects.toThrow(
      'File stream is required'
    );
  });

  it('delegates to upload() with stream intact — no buffering', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);
    const stream = Readable.from(['chunk1', 'chunk2']);
    const file = makeFile({ stream, buffer: undefined });

    await provider.uploadStream(file);

    const [command] = mockSend.mock.calls[0];
    expect(command.input.Body).toBe(stream);
    expect(Buffer.isBuffer(command.input.Body)).toBe(false);
  });

  it('passes customParams through to upload()', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);
    const file = makeFile({ stream: Readable.from(['data']) });

    await provider.uploadStream(file, { ServerSideEncryption: 'AES256' });

    const [command] = mockSend.mock.calls[0];
    expect(command.input.ServerSideEncryption).toBe('AES256');
  });

  it('returns the enriched File from upload()', async () => {
    mockSend.mockResolvedValueOnce({});
    vi.mocked(getFileUrl).mockReturnValue(
      'https://cdn.example.com/dir/file.jpg'
    );
    const provider = init(baseOptions);
    const file = makeFile({ stream: Readable.from(['data']) });

    const result = await provider.uploadStream(file);

    expect(result.url).toBe('https://cdn.example.com/dir/file.jpg');
    expect(result.provider_metadata?.key).toBe('dir/file.jpg');
  });
});

describe('delete', () => {
  beforeEach(() => mockSend.mockReset());

  it('sends DeleteObjectCommand with correct Bucket and Key', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);

    await provider.delete(makeFile());

    const [command] = mockSend.mock.calls[0];
    expect(command.input.Bucket).toBe('my-bucket');
    expect(command.input.Key).toBe('dir/file.jpg');
  });

  it('uses provider_metadata.key and bucket when present', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);
    const file = makeFile({
      provider_metadata: makeMetadata({
        key: 'custom/key.jpg',
        bucket: 'other-bucket',
      }),
    });

    await provider.delete(file);

    const [command] = mockSend.mock.calls[0];
    expect(command.input.Key).toBe('custom/key.jpg');
    expect(command.input.Bucket).toBe('other-bucket');
  });

  it('throws a generic Error when deletion fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('Access denied'));
    const provider = init(baseOptions);

    await expect(provider.delete(makeFile())).rejects.toThrow(
      'Error deleting file from DigitalOcean Spaces'
    );
  });

  it('spreads customParams into DeleteObjectCommand', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = init(baseOptions);

    await provider.delete(makeFile(), { BypassGovernanceRetention: true });

    const [command] = mockSend.mock.calls[0];
    expect(command.input.BypassGovernanceRetention).toBe(true);
  });
});

describe('checkFileSize', () => {
  it('does not throw when file size is within limit', async () => {
    const provider = init(baseOptions);

    await expect(
      provider.checkFileSize(makeFile({ size: 500 }), { sizeLimit: 1000 })
    ).resolves.toBeUndefined();
  });

  it('does not throw when file size equals the limit', async () => {
    const provider = init(baseOptions);

    await expect(
      provider.checkFileSize(makeFile({ size: 1000 }), { sizeLimit: 1000 })
    ).resolves.toBeUndefined();
  });

  it('throws PayloadTooLargeError with correct message when size exceeds limit', async () => {
    const provider = init(baseOptions);

    await expect(
      provider.checkFileSize(makeFile({ size: 2000 }), { sizeLimit: 1000 })
    ).rejects.toThrow('File size exceeds limit: 2000 > 1000');
  });

  it('throws an instance of PayloadTooLargeError, not a generic Error', async () => {
    const provider = init(baseOptions);

    const error = await provider
      .checkFileSize(makeFile({ size: 2000 }), { sizeLimit: 1000 })
      .catch(e => e);

    expect(error.name).toBe('PayloadTooLargeError');
  });
});

describe('getSignedUrl', () => {
  beforeEach(() => mockGeneratePresignedUrl.mockReset());

  it('returns a signed URL', async () => {
    mockGeneratePresignedUrl.mockResolvedValueOnce(
      'https://signed.url/file.jpg?token=abc'
    );
    const provider = init(baseOptions);

    const result = await provider.getSignedUrl(makeFile());

    expect(result).toEqual({ url: 'https://signed.url/file.jpg?token=abc' });
  });

  it('calls presigner with configured expiresIn', async () => {
    mockGeneratePresignedUrl.mockResolvedValueOnce('https://signed.url');
    const provider = init({ ...baseOptions, signedUrlExpires: 3600 });

    await provider.getSignedUrl(makeFile());

    expect(mockGeneratePresignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 }
    );
  });

  it('uses provider_metadata.key and bucket when present', async () => {
    mockGeneratePresignedUrl.mockResolvedValueOnce('https://signed.url');
    const provider = init(baseOptions);
    const file = makeFile({
      provider_metadata: makeMetadata({
        key: 'private/doc.pdf',
        bucket: 'private-bucket',
      }),
    });

    await provider.getSignedUrl(file);

    const [, command] = mockGeneratePresignedUrl.mock.calls[0];
    expect(command.input.Key).toBe('private/doc.pdf');
    expect(command.input.Bucket).toBe('private-bucket');
  });

  it('falls back to getFileKey and default bucket when provider_metadata is absent', async () => {
    mockGeneratePresignedUrl.mockResolvedValueOnce('https://signed.url');
    const provider = init(baseOptions);
    const file = makeFile();

    await provider.getSignedUrl(file);

    expect(getFileKey).toHaveBeenCalledWith(file, 'uploads');
    const [, command] = mockGeneratePresignedUrl.mock.calls[0];
    expect(command.input.Key).toBe('dir/file.jpg');
    expect(command.input.Bucket).toBe('my-bucket');
  });

  it('throws ForbiddenError when presigner fails', async () => {
    mockGeneratePresignedUrl.mockRejectedValueOnce(new Error('Forbidden'));
    const provider = init(baseOptions);

    const error = await provider.getSignedUrl(makeFile()).catch(e => e);
    expect(error.name).toBe('ForbiddenError');
    expect(error.message).toMatch('Error generating signed URL');
  });
});

describe('isPrivate', () => {
  it('returns true when ACL is private', async () => {
    const provider = init({ ...baseOptions, ACL: 'private' });
    expect(await provider.isPrivate()).toBe(true);
  });

  it('returns false when ACL is public-read', async () => {
    const provider = init({ ...baseOptions, ACL: 'public-read' });
    expect(await provider.isPrivate()).toBe(false);
  });

  it('returns false when ACL is not set (defaults to public-read)', async () => {
    const { ACL: _, ...optionsWithoutACL } = baseOptions;
    const provider = init(optionsWithoutACL);
    expect(await provider.isPrivate()).toBe(false);
  });
});
