import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', 'c37'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '724'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', '234'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', '2d2'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', 'bf6'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', 'c13'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '1af'),
    exact: true
  },
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '90a'),
    exact: true
  },
  {
    path: '/community',
    component: ComponentCreator('/community', '736'),
    routes: [
      {
        path: '/community',
        component: ComponentCreator('/community', '407'),
        routes: [
          {
            path: '/community',
            component: ComponentCreator('/community', 'f0b'),
            routes: [
              {
                path: '/community/deploy-your-site',
                component: ComponentCreator('/community/deploy-your-site', 'a8f'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/community/intro',
                component: ComponentCreator('/community/intro', 'fb8'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/community/roadmap',
                component: ComponentCreator('/community/roadmap', 'd5e'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/community/translate-your-site',
                component: ComponentCreator('/community/translate-your-site', '5e4'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '169'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '8dd'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'ec2'),
            routes: [
              {
                path: '/docs/category/tutorial---basics',
                component: ComponentCreator('/docs/category/tutorial---basics', '5c8'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/category/tutorial---extras',
                component: ComponentCreator('/docs/category/tutorial---extras', '297'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '643'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-basics/congratulations',
                component: ComponentCreator('/docs/tutorial-basics/congratulations', '45e'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-basics/create-a-blog-post',
                component: ComponentCreator('/docs/tutorial-basics/create-a-blog-post', '4de'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-basics/create-a-document',
                component: ComponentCreator('/docs/tutorial-basics/create-a-document', '223'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-basics/create-a-page',
                component: ComponentCreator('/docs/tutorial-basics/create-a-page', '6e9'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-basics/deploy-your-site',
                component: ComponentCreator('/docs/tutorial-basics/deploy-your-site', '5c0'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-basics/markdown-features',
                component: ComponentCreator('/docs/tutorial-basics/markdown-features', 'ef7'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-extras/manage-docs-versions',
                component: ComponentCreator('/docs/tutorial-extras/manage-docs-versions', '716'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              },
              {
                path: '/docs/tutorial-extras/translate-your-site',
                component: ComponentCreator('/docs/tutorial-extras/translate-your-site', '3fa'),
                exact: true,
                sidebar: "myAutogeneratedSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', '9e1'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];