export interface SeriesMetadata {
    slug: string;
    name: string;
    description: string;
    status: 'draft' | 'in-progress' | 'completed';
    intro?: string;
    locale: string;
    id: string;
  }
  
  export interface ArticleMetadata {
    slug: string;
    title: string;
    filePath: string;
    content: string;
    locale: string;
    frontmatter: {
      title?: string;
      date?: string;
      series?: string;
      locale?: string;
      tags?: string[];
      [key: string]: any;
    };
  }
  
  export interface ArticleWithSeries extends ArticleMetadata {
    series?: SeriesMetadata;
  }