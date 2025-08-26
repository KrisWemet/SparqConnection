# Data Lifecycle

* **Collection**: minimal fields; journals E2EE by default.
* **Retention**: operational data retained while account active; logs rotated; analytics aggregated.
* **Export**: user-initiated export (JSON + media) delivered via secure link.
* **Deletion**: user soft‑delete (30 days) → hard purge of personal data; cryptographic wipe of journal ciphertext (keys never stored server‑side).
* **Backups**: encrypted, 30‑day retention, tested restore quarterly.