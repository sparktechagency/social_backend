export const calculateAge = (dob: string): number => {
    const [date, month, year] = dob.split("/").map(Number);
    const birthDate = new Date(year, month - 1, date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const hasBirthdayOccured = today.getMonth() > birthDate.getMonth() || (today.getMonth === birthDate.getMonth && today.getDate() >= birthDate.getDate());
    if(!hasBirthdayOccured) age--;
    return age; 
}