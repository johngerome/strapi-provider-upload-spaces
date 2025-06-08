# strapi-provider-upload-spaces

[![Release](https://github.com/johngerome/strapi-provider-upload-spaces/actions/workflows/release.yml/badge.svg)](https://github.com/johngerome/strapi-provider-upload-spaces/actions/workflows/release.yml)
![npm package minimized gzipped size (scoped)](https://img.shields.io/bundlejs/size/strapi-provider-upload-spaces%40latest)
![NPM Version](https://img.shields.io/npm/v/strapi-provider-upload-spaces)

> A Strapi provider for uploading files to DigitalOcean Spaces.


## Installation

### npm

```bash
npm install strapi-provider-upload-spaces
```

### yarn

```bash
yarn add strapi-provider-upload-spaces
```

### pnpm

```bash
pnpm add strapi-provider-upload-spaces
```

## Configuration

Edit your Strapi configuration in `./config/plugins.js` or create it if it doesn't exist:

```javascript
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-spaces',
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
    },
  },
});
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
