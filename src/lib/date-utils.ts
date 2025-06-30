export const isDateInPast = (date: string | Date): boolean => {
  let inputDate: Date
  
  if (typeof date === 'string') {
    // Parse date string in local timezone by creating date from parts
    // This avoids the UTC interpretation issue
    const parts = date.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1 // Month is 0-indexed
      const day = parseInt(parts[2])
      inputDate = new Date(year, month, day)
    } else {
      inputDate = new Date(date)
    }
  } else {
    inputDate = new Date(date)
  }
  
  inputDate.setHours(0, 0, 0, 0)
  
  // Get today and set to start of day
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // DEBUG: Log the comparison details
  console.log('=== isDateInPast DEBUG (FIXED) ===')
  console.log('Input date string/object:', date)
  console.log('Parsed input date:', inputDate.toISOString())
  console.log('Today date:', today.toISOString())
  console.log('Input date time:', inputDate.getTime())
  console.log('Today time:', today.getTime())
  console.log('Is input < today?', inputDate < today)
  console.log('================================')
  
  return inputDate < today
}

export const getMinDateString = (): string => {
  return new Date().toISOString().split('T')[0]
}

export const getMinDateTimeString = (): string => {
  const now = new Date()
  return now.toISOString().slice(0, 16)
}