import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Explore Mushroom Species',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Shroomdex provides an extensive database of mushroom species, each detailed with rich information to enhance your knowledge and identification skills. Dive into the world of fungi with ease and accuracy.
      </>
    ),
    link: '/species'
  },
  {
    title: 'Join the Community',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Connect with fellow mycophiles in our community! Share experiences, exchange tips, and participate in discussions. Whether you're a beginner or an expert, our community is here to support and inspire your mycological journey.
      </>
    ),
    link: '/community'
  },
  {
    title: 'Mushroom Foraging',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Enhance your foraging skills with our comprehensive guides. Learn to safely identify, locate, and harvest mushrooms. Whether it's your first foray or you're honing your expertise, our resources are tailored to help you succeed.
      </>
    ),
    link: '/foraging'
  },
];

function Feature({Svg, title, description, link}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <a href={link} className="button button--primary">Learn More</a>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
