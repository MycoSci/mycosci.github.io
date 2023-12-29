---
title: Basic theme setup
subtitle: This document covers the setup and options of theme feature described in the article title
author: sara
tags: [setup]
---

### Site and author details
Add your site and author details in `_config.yml`:

```yaml
title:              Soutien
description:        Helpdesk Jekyll theme.
lang:               en

# Site subpath, e.g. /blog
baseurl:            ""

# Permalink URLs structure, for permalink style options see: https://jekyllrb.com/soutien/permalinks/
permalink:          /:title/

# Site base hostname & protocol, e.g. http://example.com
url:                "https://soutien.jekyll.plus"

# Site logo # e.g. logo.png, upload logo image file to /uploads/ folder
logo:      

# Default blog post author settings
author:
    name:           Pete Seth
    title:          Lead Developer  
    avatar:         avatar-tom.png
```

### Update favicon

You can find the current favicon (favicon.png) inside the theme `/uploads/` directory, just replace it with your new favicon.