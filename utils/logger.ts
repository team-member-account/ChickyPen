export function log(action: string, data?: unknown): void {
  console.log(`[ChickyPen] ${new Date().toISOString()} ${action}`, data ?? '');
}
export function errorMessage(error: unknown): string {
  log('error', error);
  if (error instanceof Error && !/SQL|sqlite|constraint|database/i.test(error.message))
    return error.message;
  return 'Không thể xử lý dữ liệu. Vui lòng thử lại; dữ liệu đã lưu vẫn được giữ nguyên.';
}
