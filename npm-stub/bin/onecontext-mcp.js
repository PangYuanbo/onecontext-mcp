#!/usr/bin/env node

const msg = `
onecontext-mcp (npm) is a placeholder package to reserve the name.

Install the actual server:

  - @pangyuanbo/onecontext-mcp

If you are using GitHub Packages:

  npm config set @pangyuanbo:registry https://npm.pkg.github.com
  # add auth token with read:packages to ~/.npmrc
  npm i -g @pangyuanbo/onecontext-mcp
`;

process.stderr.write(msg.trimStart());
process.stderr.write("\n");

