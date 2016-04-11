'use strict';

const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const plumber = require('gulp-plumber');
const filter = require('gulp-filter');
const gulpif = require('gulp-if');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cssminify = require('gulp-minify-css');
const envify = require('gulp-envify');
const merge = require('merge-stream');
const rimraf = require('rimraf');

function onError(err) {
	console.warn(err);
}

function getBuild(dev) {
	process.env.NODE_ENV = dev ? 'development' : 'production';

	var b = browserify({
		debug: true,
		entries: './src/zsr.js',
		//standalone: "ZSR",
		globalTransform: true,
		transform: [
			['babelify', {
				'presets': ['es2015']
			}],
		]
	});

	return b.bundle()
		.pipe(source('zsr.js'))
		.pipe(buffer())
		.pipe(plumber({errorHandler: onError}))
		.pipe(gulpif(dev, sourcemaps.init({loadMaps: true})))
		.pipe(envify())
		.pipe(filter('**/*.js'))
		.pipe(gulpif(!dev, uglify()))
		.pipe(gulpif(dev, sourcemaps.write('./')))
		.pipe(gulp.dest('./build/js/'))
}

function getSass(dev) {
	return gulp.src('./scss/*.scss')
		.pipe(plumber({errorHandler: onError}))
		.pipe(gulpif(dev, sourcemaps.init({loadMaps: true})))
		.pipe(sass())
		.pipe(autoprefixer({
				browsers: ['last 2 versions']
		}))
		.pipe(filter('**/*.css'))
		.pipe(gulpif(!dev, cssminify()))
		.pipe(gulpif(dev, sourcemaps.write('./')))
		.pipe(gulp.dest('build/css/'));
}

gulp.task('clean', function(done) {
	rimraf('./build', done);
});

gulp.task('sass', function () {
  return getSass(true);
});

gulp.task('js', function () {
  return getBuild(true);
});

gulp.task('dev', ['clean'], function() {
	gulp.watch('./src/*.js', ['js']);
	gulp.watch('./scss/*.scss', ['sass']);
	return merge(getSass(true), getBuild(true));
});

gulp.task('build', ['clean'], function() {
	return merge(getSass(false), getBuild(false));
});

gulp.task('default', ['dev']);
