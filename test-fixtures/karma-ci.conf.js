// CI karma config - includes coverage reporting
module.exports = function(config) {
	config.set({
		basePath: '',
		frameworks: ['jasmine'],
		
		files: [
			'src/**/*.js',
			'test/**/*.spec.js'
		],

		preprocessors: {
			'src/**/*.js': ['babel', 'coverage']
		},

		// Coverage reporter for CI
		coverageReporter: {
			dir: 'target/coverage/ci',
			includeAllSources: true,
			reporters: [
				{
					type: 'cobertura',
					subdir: '.',
					file: 'cobertura-coverage.xml'
				},
				{
					type: 'lcov',
					subdir: 'lcov'
				},
				{
					type: 'json',
					subdir: '.',
					file: 'coverage.json'
				}
			]
		},

		browsers: ['ChromeHeadless'],
		
		reporters: ['progress', 'junit', 'coverage'],
		
		singleRun: true
	});
};

