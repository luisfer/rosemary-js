# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# Changelog

## [1.2.0 - Arp] - 2025-08-17

### Added
- New `updateLeaf(id, { content, tags })` for atomic updates
- Configurable CSV delimiter in `exportToCSV`/`importFromCSV`
- Safe HTML rendering via `DOMPurify` + `marked` in `getLeafContentAsHTML`
- Stable ID generation using `nanoid`
- API server now loads from `ROSEMARY_DATA_FILE` if provided
- Visualization builder: fixed preset merging and added presets module; added `buildNetworkDataset()` helper and `scripts/visualize.js`
- CLI CSV import/export commands; new CLI tests; refreshed examples (botany paper network, Thailand mindmap)

### Changed
- CLI `-d/--data-file` now respected; data is loaded/saved at that path
- Auto-save consistency: `addLeaf`, `tagLeaf`, and `removeLeaf` save when `autoSave` is true
- Fuzzy search indexes array tags correctly and returns `Leaf` items

### Fixed
- CSV tags delimiter mismatch (export used `;`, import expected `,`) — now consistent and configurable
- Declared missing runtime deps for API and visualization server (`express`, `body-parser`, `swagger-jsdoc`, `swagger-ui-express`, `http-server`)

### Security
- Sanitization added to Markdown-to-HTML rendering to mitigate XSS

---

## [1.1.1] - 2024-10-04

### Added

- Added `getLeavesByConnection` method to Rosemary class
- Added method parameter documentation in Rosemary class

## [1.1.0 - Tuscan Blue] - 2024-10-03

### Added
- Improved error handling and robustness in data import/export
- New tests for edge cases and error scenarios

### Changed
- Refactored Rosemary class constructor for better flexibility
- Updated `getRelatedLeaves` method to handle isolated leaves
- Improved `connectLeaves` method to prevent self-connections

### Fixed
- Issue with `deleteLeaf` not properly removing connections
- Bugs in data import/export functionality
- Various minor issues discovered during extensive testing

### Deprecated
- Version 1.0.0 is now considered deprecated due to critical bugs

## [1.0.0] - 2024-10-02 (Deprecated)

Initial release (contains critical bugs, users should upgrade to 1.1.0)

### Added
- Initial release of Rosemary.js
- Core functionality for creating and managing leaves (nodes) of information
- Tagging system for organizing leaves
- Connection system for linking related leaves
- Basic search functionality
- Import/Export capabilities for JSON and CSV formats
- CLI interface for interacting with the knowledge base