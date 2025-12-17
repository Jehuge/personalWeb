export const extractErrorMessage = (error: any, fallback = '操作失败') => {
  // 处理超时错误
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return '请求超时，但操作可能已经完成，请刷新页面查看结果'
  }

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














































