# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# Changelog

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