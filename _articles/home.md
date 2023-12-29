---
title: Home page
subtitle: Cras at dolor eget urna varius faucibus tempus in elit. Cras a dui imperdiet, tempus metus quis, pharetra turpis.
tags: [features]
---

To add a hero header to a page add the following to a YAML Front Matter and includes in content:

{% raw %}
```yaml
---
layout: home
search: true
---

{% include categories.html columns="4" title="How can we help?" %}

{% include cta.html 
    icon="mail" title="Need more help?" text="Get in touch with us, support is provided daily" link_text="contact us" link_url="/contact/" 
    icon2="receiver" title2="Interested in our products?" text2="Our sales representatives can help you chose" link_text2="call us" link_url2="/contact/" 
%}
```
{% endraw %}