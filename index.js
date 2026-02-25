var fs = require('fs')
var path = require('path')
var Handlebars = require('handlebars')
var luxon = require('luxon')

luxon.Settings.defaultLocale("pl")

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
      return luxon.DateTime.fromISO(date).toFormat('LLL yyyy')
    },
    formatDateYear: function (date) {
      if (typeof date === 'undefined') {
        return 'now'
      }
      return luxon.DateTime.fromISO(date).toFormat("YYYY")
    },
    networkIcon: function (network) {
      if (network === 'StackOverflow') {
        return 'stack-overflow'
      } else {
        return network.toLowerCase()
      }
    },

    wordWrap: function (str) {
      str = str.replace(/\//g, "/ ");
      return str.replace("/ / ", "//");
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

      switch (years%10) {
        case 1:
          text += `${years} rok`
          break;
        case years < 5:
          text += `${years} lata`
          break;
        case 0:
          break;
        default:
          text += `${years} lat`
      }
      if (months > 0) {
        if (years > 0) {
          text += ' '
        }
        switch (months%10) {
        case 1:
          text += `${months} miesiąc`
          break;
        case months < 5:
          text += `${months} miesiące`
          break;
        default:
          text += `${months} miesięcy`
      }
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
