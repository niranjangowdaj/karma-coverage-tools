# Karma Coverage Tools

Automatic code coverage visualization for Karma test runner. Displays coverage directly in your editor without manual configuration.

## Features

* **Automatic Detection** - Finds and parses Karma configuration files in your workspace
* **Zero Configuration** - Reads coverage settings directly from your karma.conf.js
* **Monorepo Support** - Handles multiple Karma configurations across packages
* **Istanbul-Style Badges** - Shows execution counts (1x, 5x, 10x) in the gutter
* **Detailed Tooltips** - Hover over indicators to see coverage statistics and suggestions
* **Live Updates** - Automatically refreshes when coverage files change
* **Run Tests** - Execute Karma tests directly from VS Code in headless mode
* **Status Bar** - Real-time coverage percentage display

![Coverage Display](images/screenshot.png)

## Quick Start

1. Install the extension
2. Open a workspace with a Karma configuration file (e.g., `karma.conf.js`)
3. Ensure your Karma config has `coverageReporter` configured
4. Run your tests to generate coverage
5. Coverage indicators appear automatically in the editor

## Usage

### Viewing Coverage

Once your tests have generated coverage files, the extension automatically displays:

* **Green badges** (e.g., 5x) - Line covered, executed 5 times
* **Orange badges** - Line covered but branch partially tested  
* **Red indicators** - Line not covered by tests
* **Overview ruler** - Colored markers in the scrollbar for quick navigation

Hover over any indicator to see detailed coverage information including execution count, branch coverage, and improvement suggestions.

### Status Bar

The status bar item in the lower-right shows:

* Coverage percentage when available
* Status of detected Karma configurations
* Click to toggle coverage display
* Double-click to refresh and show detailed breakdown

### Commands

Access commands via the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

* `Karma Coverage: Toggle Display` - Show or hide coverage indicators
* `Karma Coverage: Refresh` - Reload coverage data and display detailed report
* `Karma Coverage: Run Tests` - Execute all detected Karma configurations in headless mode

### Running Tests

The extension can run your Karma tests automatically:

1. Open Command Palette
2. Run `Karma Coverage: Run Tests`
3. Tests execute in headless Chrome for each detected configuration
4. Coverage updates automatically when tests complete

Perfect for monorepos with multiple test suites.

## Requirements

* Karma configuration file ending in `conf.js` (e.g., `karma.conf.js`, `karma-unit.conf.js`)
* Coverage reporter configured in Karma config (Cobertura or LCOV format)
* For running tests: Karma installed locally (`npm install --save-dev karma`)

### Example Karma Configuration

```javascript
module.exports = function(config) {
  config.set({
    // ... other settings
    
    reporters: ['progress', 'coverage'],
    
    coverageReporter: {
      dir: 'coverage/',
      reporters: [
        { type: 'html' },
        { type: 'cobertura' },
        { type: 'lcov' }
      ]
    }
  });
};
```

## Supported Coverage Formats

* Cobertura XML
* LCOV

The extension automatically detects and parses both formats based on your Karma configuration.

## Monorepo Support

The extension intelligently handles monorepo setups:

* Detects Karma configurations across all packages
* Tracks coverage separately for each package
* Resolves paths relative to each configuration file location
* Aggregates statistics in the status bar
* Runs tests for all configurations when using Run Tests command

## Extension Settings

This extension does not contribute any VS Code settings. Configuration is read directly from your Karma configuration files.

## Known Issues

* Coverage files must be generated before display (run tests at least once)
* Headless test execution requires Chrome/Chromium installed
* Very large monorepos (20+ configurations) may experience slower detection

## Release Notes

### 0.1.0

Initial release with core features:

* Automatic Karma configuration detection
* Coverage visualization with Istanbul-style indicators
* Monorepo support with multiple configurations
* Status bar integration with click interactions
* Run tests command for headless execution
* Support for Cobertura and LCOV formats
* Hover tooltips with detailed coverage information

## Contributing

Issues and feature requests are welcome on the [GitHub repository](https://github.com/your-username/karma-coverage-tools).

## License

MIT

---

**Enjoy accurate code coverage visualization!**

