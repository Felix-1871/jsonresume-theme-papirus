var fs = require('fs')
var path = require('path')
var Handlebars = require('handlebars')
var moment = require('moment')
var pluralize = require('pluralize')

// Font Awesome icons are inlined as SVG paths: the icon font would put
// private-use characters into the PDF text layer and confuse text extractors.
var fontAwesomeDir = path.dirname(require.resolve('font-awesome/package.json'))
var icons = loadIcons()

function loadIcons () {
  var glyphs = {}
  var font = fs.readFileSync(path.join(fontAwesomeDir, 'fonts/fontawesome-webfont.svg'), 'utf-8')
  for (var glyph of font.matchAll(/<glyph\b([^>]*)\/>/g)) {
    var unicode = /unicode="&#x([0-9a-f]+);"/.exec(glyph[1])
    var d = /\sd="([^"]+)"/.exec(glyph[1])
    var width = /horiz-adv-x="([\d.]+)"/.exec(glyph[1])
    if (unicode && d) {
      glyphs[unicode[1]] = { d: d[1].replace(/\s+/g, ' '), width: width ? Number(width[1]) : 1536 }
    }
  }
  var icons = {}
  var css = fs.readFileSync(path.join(fontAwesomeDir, 'css/font-awesome.css'), 'utf-8')
  for (var rule of css.matchAll(/((?:\.fa-[\w-]+:before,?\s*)+)\{\s*content: "\\([0-9a-f]+)";/g)) {
    for (var name of rule[1].matchAll(/\.fa-([\w-]+):before/g)) {
      icons[name[1]] = glyphs[rule[2]]
    }
  }
  return icons
}

function render (resume) {
  var css = fs.readFileSync(path.join(__dirname, '/style.css'), 'utf-8')
  var tpl = fs.readFileSync(path.join(__dirname, '/resume.hbs'), 'utf-8')
  var partialsDir = path.join(__dirname, 'partials')
  var filenames = fs.readdirSync(partialsDir)

  Handlebars.registerHelper({
    formatDate: function (date) {
      if (typeof date === 'undefined') {
        return 'now'
      }
      return moment(date).format('MMM YYYY')
    },
    formatDateYear: function (date) {
      if (typeof date === 'undefined') {
        return 'now'
      }
      return moment(date).format('YYYY')
    },
    networkIcon: function (network) {
      if (network === 'StackOverflow') {
        return 'stack-overflow'
      } else {
        return network.toLowerCase()
      }
    },
    icon: function (name) {
      var glyph = icons[name]
      if (!glyph) {
        return new Handlebars.SafeString('<i class="fa fa-' + Handlebars.Utils.escapeExpression(name) + '"></i>')
      }
      return new Handlebars.SafeString('<i class="fa"><svg viewBox="0 -1536 ' + glyph.width + ' 1792" style="width: ' + glyph.width / 1792 + 'em; height: 1em; vertical-align: -0.1429em; fill: currentColor"><path transform="scale(1, -1)" d="' + glyph.d + '"/></svg></i>')
    },
    // <wbr> lets long URLs wrap after a "/" without adding spaces to the extracted text
    wordWrap: function (str) {
      return new Handlebars.SafeString(Handlebars.Utils.escapeExpression(str).replace(/(?<!\/)\/(?!\/)/g, '/<wbr>'))
    },
    dateDiff: function (startDate, endDate) {
      let text = ''
      startDate = moment(startDate)
      if (endDate === null || endDate === '' || endDate === undefined) {
        endDate = moment()
      } else {
        endDate = moment(endDate)
      }
      let years = endDate.diff(startDate, 'years')
      startDate.add(years, 'years')
      let months = endDate.diff(startDate, 'months')

      if (years > 0) {
        text += `${years} ${pluralize('years', years)}`
      }
      if (months > 0) {
        if (years > 0) {
          text += ' '
        }
        text += `${months} ${pluralize('months', months)}`
      }

      return text
    }
  })

  filenames.forEach(function (filename) {
    var matches = /^([^.]+).hbs$/.exec(filename)
    if (!matches) {
      return
    }
    var name = matches[1]
    var filepath = path.join(partialsDir, filename)
    var template = fs.readFileSync(filepath, 'utf8')

    Handlebars.registerPartial(name, template)
  })
  return Handlebars.compile(tpl)({
    css: css,
    resume: resume
  })
}

function exportPdf (resumeFile, pageFormat) {
  let resume = require(path.join(__dirname, resumeFile))
  const pdf = require('html-pdf')
  const template = render(resume, pageFormat)

  pdf.create(template, {format: pageFormat}).toFile('./resume.pdf', function (err, res) {
    if (err) return console.log(err)
  })
}

module.exports = {
  render: render,
  exportPdf: exportPdf
}
