import withPWA from 'next-pwa';

const pwaConfig = withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
});

const nextConfig = {
    output: 'standalone',
    experimental: {
        outputFileTracingRoot: undefined,
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups',
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return {
            // Fallback phase: only proxy to Flask when no local route —
            // including dynamic ones like /api/analytics/station/[id] —
            // matched the request. afterFiles rewrites would win against
            // dynamic routes and wrongly proxy them.
            fallback: [
                {
                    source: '/api/:path*',
                    destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://api.airwave.qzz.io/api'}/:path*`,
                },
            ],
        };
    },
    images: {
        domains: ['localhost', 'yourdomain.com'],
    },
};

export default pwaConfig(nextConfig);