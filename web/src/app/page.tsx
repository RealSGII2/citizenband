import styles from './page.module.scss'

export default function Home() {
  return (
    <div style={{ padding: 36 }}>
      <h1>CitizenBand</h1>
      <p>Group voice chat with post processing slapped on for good measure.</p>
      <a href='#' className={styles.downloadButton}>Download</a>
    </div>
  );
}
