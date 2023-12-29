---
title: Call to action
subtitle: Cras at dolor eget urna varius faucibus tempus in elit. Cras a dui imperdiet, tempus metus quis, pharetra turpis.
tags: [features]
author: alex
---

### Home page
To add the following to a page:
{% raw %}
```yaml
{% include cta.html 
    icon="mail" title="Need more help?" text="Get in touch with us, support is provided daily" link_text="contact us" link_url="/contact/" 
    icon2="receiver" title2="Interested in our products?" text2="Our sales representatives can help you chose" link_text2="call us" link_url2="/contact/" 
%}
```
{% endraw %}

### Article page
Add the following setting in `_config.yml`:
```yaml
article:
  cta:
    text: "Didn't find an answer to your question, we are here to help"
    button_text: "Contact Us"
    button_url: /contact/

```