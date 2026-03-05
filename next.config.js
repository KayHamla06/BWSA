/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },

  // THIS IS THE FIX — enables @apply in .module.css files (Next.js 13+ App Router)
  webpack(config) {
    // Find the existing CSS rule and modify it
    const rules = config.module.rules.find((rule) =>
      typeof rule.oneOf === 'object'
    ).oneOf;

    rules.forEach((rule) => {
      if (rule.test?.toString().includes('.module.css')) {
        rule.use = [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]__[hash:base64:5]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [require('tailwindcss'), require('autoprefixer')],
              },
            },
          },
        ];
      }
    });

    return config;
  },
};

export default nextConfig;