---
title: Creating article posts
subtitle: Cras at dolor eget urna varius faucibus tempus in elit. Cras a dui imperdiet, tempus metus quis, pharetra turpis.
tags: [setup]
---

Create new article post entries in `_articles` folder, similar to creating posts, but with following front matter settings:

```yml
---
title: Category hosting Setting up new domain and page
subtitle: This is optional article subtitle
tags: [featured, development]
---
```

Sidebar navigation on articles post can edited in `_data/articles.yml`:

```yml
- title: Getting Started    # Section title
  icon: cog
  articles:
  - home                    # article file name from _articles folder
  - quickstart
  - installation
  - windows
```
