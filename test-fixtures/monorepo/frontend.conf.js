// Frontend package karma config
module.exports = function(config) {
	config.set({
		basePath: 'packages/frontend',
		frameworks: ['jasmine'],
		
		files: ['src/**/*.js', 'test/**/*.spec.js'],

		preprocessors: {
			'src/**/*.js': ['coverage']
		},

		coverageReporter: {
			dir: 'packages/frontend/coverage',
			reporters: [
				{ type: 'html', subdir: 'html' },
				{ type: 'cobertura', subdir: '.', file: 'cobertura.xml' }
			]
		},

		reporters: ['progress', 'coverage'],
		browsers: ['ChromeHeadless'],
		singleRun: true
	});
};

