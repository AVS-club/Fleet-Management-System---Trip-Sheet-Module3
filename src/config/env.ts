const env = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) {
    return import.meta.env.MODE as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return 'development';
})();

export const isDev = env === 'development';
export const isTest = env === 'test';
export const isProd = env === 'production';

export default {
  isDev,
  isTest,
  isProd,
};
