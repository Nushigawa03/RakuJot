  export interface Filter {
    name: string;
    query: string;
    isCategory: boolean;
  }
  
  export const filters: Filter[] = [
    { name: '仕事', query: '仕事', isCategory: false },
    { name: '重要なアイデア', query: '重要 アイデア', isCategory: true },
    { name: 'プライベート OR アイデア', query: 'プライベート OR アイデア', isCategory: false },
    { name: 'アイデア NOT TODO', query: 'アイデア NOT TODO', isCategory: false },
    { name: 'TODO', query: 'TODO', isCategory: false },
  ];