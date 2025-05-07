export interface YearModel {
  id: number;
  name: string;
}

export const getLast200Years = ()=> {
    const currentYear = new Date().getFullYear();
    const years: YearModel[] = [];
  
    for (let i = 0; i < 200; i++) {
      const year: number = currentYear - i;
      years.push({id: year, name: `${year}`});
    }
  
    return years;
  }