const TARGET_SERIES = process.env.TARGET_SERIES?.split(',') || null;
const EXCLUDE_SERIES = process.env.EXCLUDE_SERIES?.split(',') || [];
const ONLY_STATUS = process.env.ONLY_STATUS?.split(',') || null;

export const contentConfig = {
  blogRoot: './data/content',
  articlesPath: '/posts',
  seriesPath: '/series',
  seriesFilter: {
    enabled: process.env.DISABLE_SERIES_FILTER !== 'true',
    includeSeries: TARGET_SERIES,
    excludeSeries: EXCLUDE_SERIES,
    onlyStatus: ONLY_STATUS,
    filePattern: process.env.FILE_PATTERN 
      ? new RegExp(process.env.FILE_PATTERN) 
      : null,
  },
  locales: {
    default: 'zh',
    supported: ['zh', 'en'],
    fileNamePattern: /\.([a-z]{2}(-[A-Z]{2})?)\.mdx?$/, 
  },
  frontmatter: {
    enabled: true,
    fields: ['title', 'date', 'slug', 'tags', 'seriesSlug', 'seriesOrder', 'description'],
  },
};