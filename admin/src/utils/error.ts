export const extractErrorMessage = (error: any, fallback = '操作失败') => {
  const detail = error?.response?.data?.detail || error?.message

  if (!detail) return fallback
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    const message = detail
      .map((item) => item?.msg || item?.message || item?.detail || '')
      .filter(Boolean)
      .join('；')
    return message || fallback
  }

  if (typeof detail === 'object') {
    return (
      detail?.msg ||
      detail?.message ||
      detail?.detail ||
      detail?.error ||
      JSON.stringify(detail)
    )
  }

  return fallback
}





























