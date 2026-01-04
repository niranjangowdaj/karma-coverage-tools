// Sample karma.conf.js for testing the extension
// Place this file in a test workspace to verify the extension detects it

module.exports = function(config) {
  config.set({
    // Base configuration
    basePath: '',
    frameworks: ['jasmine'],
    files: ['src/**/*.js', 'test/**/*.js'],

    // Preprocessors - which files to instrument for coverage
    preprocessors: {
      'src/**/*.js': ['coverage']
    },

    // Coverage reporter configuration
    coverageReporter: {
      dir: 'target/coverage/frontend-unit-metric/',
      includeAllSources: true,
      reporters: [
        {
          type: 'html',
          subdir: 'report-html/ut'
        },
        {
          type: 'text'
        },
        {
          type: 'lcov',
          subdir: 'report-lcov/ut'
        },
        {
          type: 'cobertura',
          subdir: '.',
          file: 'cobertura-coverage.xml'
        }
      ],
      instrumenterOptions: {
        istanbul: {
          noCompact: true
        }
      }
    },

    // Reporters
    reporters: ['progress', 'coverage'],

    // Browser configuration
    browsers: ['ChromeHeadless'],

    // Single run mode
    singleRun: true
  });
};

