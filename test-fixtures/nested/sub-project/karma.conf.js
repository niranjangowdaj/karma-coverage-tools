module.exports = function(config) {
  config.set({
    basePath: './',
    frameworks: ['jasmine'],
    files: ['src/**/*.spec.js'],
    preprocessors: {
      'src/**/*.js': ['coverage']
    },
    reporters: ['progress', 'coverage'],
    
    // Coverage reporter configuration
    // Relative paths should be resolved from the karma config directory
    coverageReporter: {
      dir: './coverage',  // This should resolve to test-fixtures/nested/sub-project/coverage
      reporters: [
        { type: 'html', subdir: 'report-html' },
        { type: 'cobertura', subdir: '.', file: 'cobertura.xml' },
        { type: 'lcov', subdir: 'report-lcov' }
      ]
    },
    
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false
  });
};

