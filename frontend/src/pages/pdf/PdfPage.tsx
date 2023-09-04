import chatstyles from "../chat/Chat.module.css";
import { Worker } from '@react-pdf-viewer/core';
import { Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

const PdfPage = () => {
   
    const fileUrl = "https://devprinciples.blob.core.windows.net/book-toc/TableOfContents.pdf"
    return (
        <div className={chatstyles.chatContainer}>
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <Viewer fileUrl={fileUrl} />
            </Worker>
            <p></p>
        </div>
    );
};

export default PdfPage;
