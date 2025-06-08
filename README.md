# @johngerome/strapi-provider-upload-spaces

[![Release](https://github.com/johngerome/strapi-provider-upload-spaces/actions/workflows/release.yml/badge.svg)](https://github.com/johngerome/strapi-provider-upload-spaces/actions/workflows/release.yml)
![npm bundle size](https://img.shields.io/bundlephobia/min/%40johngerome%2Fstrapi-provider-upload-spaces)
![NPM Version](https://img.shields.io/npm/v/@johngerome/strapi-provider-upload-spaces)
![GitHub License](https://img.shields.io/github/license/johngerome/strapi-provider-upload-spaces)


> A Strapi provider for uploading files to DigitalOcean Spaces. Compatible with Strapi v4 and v5.


## Installation

### npm

```bash
npm install @johngerome/strapi-provider-upload-spaces
```

### yarn

```bash
yarn add @johngerome/strapi-provider-upload-spaces
```

### pnpm

```bash
pnpm add @johngerome/strapi-provider-upload-spaces
```

## Configuration

Edit your Strapi configuration in `./config/plugins.js`:

```javascript
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: '@johngerome/strapi-provider-upload-spaces',
      providerOptions: {
        credentials: {
          accessKeyId: env('DO_SPACE_ACCESS_KEY'),
          secretAccessKey: env('DO_SPACE_SECRET_KEY'),
        },
        endpoint: env('DO_SPACE_ENDPOINT'), // e.g., 'nyc3.digitaloceanspaces.com'
        region: env('DO_SPACE_REGION', 'us-east-1'),
        bucket: env('DO_SPACE_BUCKET'),
        directory: env('DO_SPACE_DIRECTORY', ''), // Optional, defaults to root
        cdn: env('DO_SPACE_CDN'), // Optional, CDN URL if configured
        ACL: env('DO_SPACE_ACL', 'public-read'), // Optional, defaults to 'public-read'
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
```

## Security Middleware Configuration

Due to the default settings in the Strapi Security Middleware you will need to modify the `contentSecurityPolicy` settings to properly see thumbnail previews in the Media Library.

Edit your Strapi configuration in `./config/middlewares.js`:

```javascript
module.exports = [
  // ...
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'yourBucketName.yourRegion.cdn.digitaloceanspaces.com', // with CDN
            'yourBucketName.yourRegion.digitaloceanspaces.com',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'yourBucketName.yourRegion.cdn.digitaloceanspaces.com', // with CDN
            'yourBucketName.yourRegion.digitaloceanspaces.com',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ...
];
```

## Environment Variables

Add these variables to your `.env` file:

```
DO_SPACE_ACCESS_KEY=your_access_key
DO_SPACE_SECRET_KEY=your_secret_key
DO_SPACE_ENDPOINT=your_space_endpoint
DO_SPACE_REGION=your_space_region
DO_SPACE_BUCKET=your_space_name
DO_SPACE_DIRECTORY=optional_directory_path
DO_SPACE_CDN=optional_cdn_url
DO_SPACE_ACL=optional_acl_setting
```

## License

MIT
