---
title: Creating a changelog
subtitle: Cras at dolor eget urna varius faucibus tempus in elit. Cras a dui imperdiet, tempus metus quis, pharetra turpis.
tags: [setup]
---

### Timeline changelog

Timeline changelog can be added to a page using an include and its data is pulled from a `_data/changelog.yml` data file. This changelog is suitable for simple lists of changes.

Add changelog to a page using the following include:
{% raw %}
```yaml
{% include changelog.html %}
```
{% endraw %}

Changelog enties are added in `_data/changelog.yml`:

```yml
- title: Version 0.6.0
  date: Aug 15, 2017
  list:
  - Added style support for radio and checkbox in Firefox
  - Removed class from Section component
```