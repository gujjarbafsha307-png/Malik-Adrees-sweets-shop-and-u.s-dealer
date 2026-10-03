export const money = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-PK')}`
export const dateTime = (value) => new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
