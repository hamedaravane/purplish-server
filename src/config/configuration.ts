import * as process from 'process';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    type: process.env.DATABASE_TYPE,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME,
    name: process.env.DATABASE_NAME,
  },
  proxy: {
    host: process.env.PROXY_SOCKS5_HOST,
    port: process.env.PROXY_SOCKS5_PORT,
  },
});
