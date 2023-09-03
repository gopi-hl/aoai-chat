
import { Stack } from "@fluentui/react";
import styles from "./PdfPage.module.css";
import chatstyles from "../chat/Chat.module.css";
import { useState } from "react";
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const PdfPage = () => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);

    function onDocumentLoadSuccess({ numPages }: { numPages: any }) {
        setNumPages(numPages);
    }
    return (
        <div className={chatstyles.chatContainer}>
            <Document
                file="https://d1.awsstatic.com/product-marketing/S3/Amazon_S3_Security_eBook_2020.pdf"
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={console.error}
                className={styles.pdfdocument}
            >
                {Array.from(new Array(numPages), (el, index) => (
                    <Page
                        className={styles.pdfpage}
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        width={window.innerWidth < 820 ? window.innerWidth - 100 : undefined}
                    />
                ))}
            </Document>
            <p></p>
        </div>
    );
};

export default PdfPage;
