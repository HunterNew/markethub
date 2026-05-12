export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    active: 'badge-success', approved: 'badge-success', completed: 'badge-success', delivered: 'badge-success', paid: 'badge-success',
    pending: 'badge-warning', pending_approval: 'badge-warning', pending_payment: 'badge-warning',
    rejected: 'badge-error', cancelled: 'badge-error', deleted: 'badge-error', refunded: 'badge-error',
    shipped: 'badge-info', confirmed: 'badge-info',
    out_of_stock: 'badge-gray',
  }
  return map[status] || 'badge-gray'
}

export const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: 'Active', approved: 'Approved', completed: 'Completed', delivered: 'Delivered',
    pending: 'Pending', pending_approval: 'Pending Approval',
    rejected: 'Rejected', cancelled: 'Cancelled', deleted: 'Deleted',
    shipped: 'Shipped', confirmed: 'Confirmed', paid: 'Paid', refunded: 'Refunded',
    out_of_stock: 'Out of Stock',
  }
  return map[status] || status
}

export const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export const truncate = (str: string, len = 60) => str.length > len ? str.slice(0, len) + '...' : str
