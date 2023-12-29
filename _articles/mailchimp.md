---
title: Displaying mailchimp newsletter sign up form on a blog post
subtitle: Cras at dolor eget urna varius faucibus tempus in elit. Cras a dui imperdiet, tempus metus quis, pharetra turpis.
tags: [features, featured]
---

Add the following code in `_congig.yml`:
```yaml
mailchimp:
  title:          "Get your weekly startup report"
  form_action:    "https://mycompany.us8.list-manage.com/subscribe/post?u=2e56c12fcd37e5dab02bd&amp;id=e6e94847464"
  hidden_name:    "b_2e56c123105fcd37e5dab02bd_e68475657"

post:
  mailchimp: true
```

Get the values for `form_action` and `hidden_name` from your mailchimp embed form:

Get `form_action` value from:

```
<form action="https://mycompany.us8.list-manage.com/subscribe/post?u=2e56c12fcd37e5dab02bd&amp;id=e6e94847464" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" class="validate" target="_blank" novalidate>
```

Get `hidden_name` value from:
```
<input type="text" name="b_2e56c123105fcd37e5dab02bd_e68475657" tabindex="-1" value="">
```