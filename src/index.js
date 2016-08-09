import moment from "moment";
import Pdf from "pdfmake-browser";
import robotoFont from "roboto-base64";

const defaultStyle = {
  fontSize: 10
};

const tableLayout = {
  hLineWidth: (i) => {
    return (i === 1) ? 1 : 0;
  },
  vLineWidth: () => {
    return 0;
  },
  paddingLeft: () => {
    return 0;
  },
  paddingRight: () => {
    return 0;
  },
  paddingTop: (i) => {
    return (i === 1) ? 15 : 5;
  },
  paddingBottom: () => {
    return 5;
  }
};

const footerLayout = {
  hLineWidth: (i, node) => {
    return (
      i === 0 ||
      i === node.table.body.length ||
      i === node.table.body.length - 1
    ) ? 1 : 0;
  },
  vLineWidth: () => {
    return 0;
  },
  paddingLeft: () => {
    return 0;
  },
  paddingRight: () => {
    return 0;
  },
  paddingTop: (i, node) => {
    return (
      i === 0 ||
      i === node.table.body.length - 1
    ) ? 10 : 5;
  },
  paddingBottom: (i, node) => {
    return (
      i === node.table.body.length - 1 ||
      i === node.table.body.length - 2
    ) ? 10 : 5;
  }
};

export default (options) => {
  return new Pdf(getTemplate(options), {
    Roboto: robotoFont
  });
};

function getTemplate(options) {
  const organizationAddress = options.organizationAddress || null;
  const billingAddress = options.billingAddress || {};
  const date = options.date || moment();
  const dueDate = options.dueDate || moment().add(10, "days");
  const invoiceNumber = options.invoiceNumber || "";
  const customerName = options.customerName || "";
  const items = options.items || [];
  const subTotal = options.subTotal || 0;
  const adjustment = options.adjustment || 0;
  const taxGroups = options.taxGroups || [];
  const total = options.total || 0;
  const currency = options.currency || "CHF";
  const note = options.note;

  const leftFields = [];
  if (billingAddress.name) {
    leftFields.push(billingAddress.name);
  }
  if (billingAddress.attn) {
    leftFields.push(billingAddress.attn);
  }
  if (billingAddress.street) {
    leftFields.push(billingAddress.street);
  }
  const location = (billingAddress.postCode || "") + (billingAddress.city && billingAddress.postCode ? " " : "") + (billingAddress.city || "");
  if (location) {
    leftFields.push(location);
  }

  const rightFields = [];
  if (date) {
    rightFields.push({
      key: "Datum:",
      value: date.format("DD.MM.YYYY")
    });
  }
  if (dueDate) {
    rightFields.push({
      key: "Zahlbar bis:",
      value: dueDate.format("DD.MM.YYYY")
    });
  }
  if (invoiceNumber) {
    rightFields.push({
      key: "Rechnungsnummer:",
      value: invoiceNumber.toString()
    });
  }
  if (customerName) {
    rightFields.push({
      key: "Kunde:",
      value: customerName
    });
  }

  const headTableBody = [];
  const tableHeight = Math.max(leftFields.length, rightFields.length);
  for (let i = 0; i < tableHeight; i++) {
    const leftValue = leftFields[i];
    const rightObject = rightFields[i] || {};
    headTableBody.push([
      leftValue || "",
      "",
      rightObject.key || "", {
        text: rightObject.value || "",
        alignment: "right"
      }
    ]);
  }

  const organizationAddressText = organizationAddress ? getFlatAddressText(organizationAddress) : "";

  const doc = {
    defaultStyle: defaultStyle,
    content: [{
      text: organizationAddressText,
      margin: [0, 100, 0, 0],
      fontSize: 8,
      color: "gray"
    }, {
      margin: [0, 10, 0, 0],
      layout: "noBorders",
      table: {
        widths: ["auto", "*", "auto", "auto"],
        body: headTableBody
      }
    }, {
      fontSize: 18,
      text: "Rechnung",
      margin: [0, 50, 0, 0]
    }, {
      margin: [0, 25, 0, 0],
      layout: tableLayout,
      table: {
        headerRows: 1,
        widths: ["*", 70, 70, 70],
        body: [
          ["Beschreibung", {
            text: "Menge",
            alignment: "right"
          }, {
            text: "Preis",
            alignment: "right"
          }, {
            text: "Betrag",
            alignment: "right"
          }]
        ]
      }
    }]
  };

  items.forEach((item) => {
    let description;
    if (item.description) {
      description = {
        stack: [
          item.name, {
            margin: [0, 2, 0, 0],
            text: item.description,
            color: "gray"
          }
        ]
      };
    } else {
      description = item.name;
    }

    doc.content[3].table.body.push([
      description, {
        text: item.quantity.toFixed(2),
        alignment: "right"
      }, {
        text: item.rate.toFixed(2),
        alignment: "right"
      }, {
        text: item.total.toFixed(2),
        alignment: "right"
      }
    ]);
  });

  let tableFooter = [];

  if (subTotal && subTotal !== total) {
    if (adjustment || taxGroups.length) {
      tableFooter.push(
        ["Zwischensumme", {
          text: subTotal.toFixed(2),
          alignment: "right"
        }]
      );
    }
  }

  if (taxGroups.length) {
    tableFooter = tableFooter.concat(
      taxGroups.map((taxGroup) => {
        return [
          taxGroup.name, {
            text: taxGroup.amount.toFixed(2),
            alignment: "right"
          }
        ];
      })
    );
  }

  if (adjustment) {
    tableFooter.push([
      "Anpassung", {
        text: adjustment.toFixed(2),
        alignment: "right"
      }
    ]);
  }

  tableFooter.push([
    "Gesamtsumme " + currency, {
      text: total.toFixed(2),
      alignment: "right"
    }
  ]);

  doc.content.push({
    margin: [0, 25, 0, 0],
    layout: footerLayout,
    table: {
      headerRows: 1,
      widths: ["*", "auto"],
      body: tableFooter
    }
  });

  if (note) {
    doc.content.push({
      text: note,
      margin: [0, 20, 0, 0],
      color: "gray",
      fontSize: 8
    });
  }

  return doc;
}

function getFlatAddressText(address) {
  const location = [address.postCode, address.city].join(" ").trim();

  return [address.name, address.street, location].filter((value) => {
    return value;
  }).join(", ");
}
