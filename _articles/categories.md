---
title: Category boxes section
subtitle: Cras at dolor eget urna varius faucibus tempus in elit. Cras a dui imperdiet, tempus metus quis, pharetra turpis.
tags: [features]
---

Home page category boxes are added in `_data/articls.yml`, e.g.:
```yml
- title: Getting Started
  icon: settings
  articles: 
    - usage

- title: Account and Billing
  icon: credit-card
  articles: 
    - drafts
```

All available icons can be found [here](https://getuikit.com/docs/icon#library).

Add boxes section to a page using the following include:
{% raw %}
```yaml
{% include categories.html columns="4" title="Browse Topics" %}
```
{% endraw %}

