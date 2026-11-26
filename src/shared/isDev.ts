export function isDev(): boolean {
  // Bundlers replace `process.env.NODE_ENV` statically, so it must be written
  // exactly like this. The try/catch covers environments with no bundler.
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}
