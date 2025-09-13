import styles from './page.module.scss';

export default function Home() {
  return (<div style={{ padding: 36 }}>
      <h1>CitizenBand</h1>
      <p>A group voice chat built to simulate the effects of a CB radio.
        <br />
        <span className={styles.note}><b>Note:</b> This is not a commonly used app. Windows may bug you about it not being recognised; that&apos;s normal.</span>
      </p>
      <a
        target='_blank'
        rel='noreferrer'
        href='https://github.com/RealSGII2/citizenband/releases/latest/download/CitizenBand-Setup.exe'
        className={styles.downloadButton}
      >Download
      </a>
    </div>);
}
