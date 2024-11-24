class DragAndResize{
    constructor(rect, width, height) {
		this.dragging = false;  // Durata del timer in millisecondi
		this.resizing = false;  // Funzione da eseguire al termine del timer
		this.offsetX = 0;  
        this.offsetY = 0;  
        this.selectedCorner = null;  
        this.rotated = false;  
        this.region = rect;
        this.rot = false;
        this.rect = this.region;
        this.width = width;
        this.height = height;
	}

    setRotation(rot){
        this.rot = rot;
        if(this.rot){
            // traduzione del rettangolo ruotato in una immaggine nel riferimento non ruotato
            rect[0] = -this.region[0];
            rect[1] = this.height - this.region[1];
            rect[2] = -this.region[2];
            rect[3] = this.height - this.region[3];
            console.log("rect rot----------------------------");
        }else{		
            // traduzione del rettangolo non ruotato in una immaggine nel riferimento non ruotato
            rect[0] = this.region[0];
            rect[1] = this.region[1];
            rect[2] = this.region[2];
            rect[3] = this.region[3];
            // Scala i valori del mouse per adattarli al riferimento dello schermo!!!
            console.log("rect no rot----------------------------");
        }
    }

    mousePressed() {
        let scaledX = 0;
        let scaledY = 0;
        
        // passaggio dell'input del mouse al riferimento non ruotato
        scaledX = mouseX - this.width /2;
        scaledY = this.height - mouseY;
        
        ///---------CALCOLO DELL'OFFSET NEL RIFERIMENTO NON RUOTATO--------------------------
        console.log("mousePressed----------------------------");
        console.log("rect: "+rect);
        console.log("scaledX-rect[0]: "+scaledX+"-"+this.rect[0]);
        console.log("scaledY- rect[1]: "+scaledY+"-"+this.rect[1]);
        // Check if mouse is near any corner for resizing
        const resizeThreshold = 10;
        let inside1 = scaledX > this.rect[0] && scaledX < this.rect[2] && scaledY > this.rect[3] && scaledY < this.rect[1];
        let inside2 = scaledX > this.rect[2] && scaledX < this.rect[0] && scaledY > this.rect[1] && scaledY < this.rect[3];
        if (this.isNearCorner(scaledX, scaledY, rect[0], rect[1], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'topLeft';
            console.log("Near topleft");
        } else if (this.isNearCorner(scaledX, scaledY, this.rect[2], this.rect[1], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'topRight';
            console.log("Near topRight");
        } else if (this.isNearCorner(scaledX, scaledY, this.rect[0], this.rect[3], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'bottomLeft';
            console.log("Near bottomLeft");
        } else if (this.isNearCorner(scaledX, scaledY, this.rect[2], this.rect[3], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'bottomRight';
            console.log("Near bottomRight");
        } else if (inside1 || inside2) {
            cursor("grab");
            console.log("Near inside for dragging");
            // Otherwise check if inside the rectangle for dragging 
            // Traslazione
            this.dragging = true;
            this.offsetX = scaledX - this.rect[0]; 
            this.offsetY = scaledY - this.rect[1];
            console.log("offset: "+offsetX+" - "+offsetY);
        }else{
            cursor(ARROW);
        }
    }

    mouseDragged() {
        let scaledX = 0;
        let scaledY = 0;

        // passaggio dell'input del mouse al riferimento non ruotato
        scaledX = mouseX - this.width /2;
        scaledY = this.height - mouseY;
        
           
    ///---------CALCOLO DEL DRAG & DROP NEL RIFERIMENTO NON RUOTATO A PARTIRE DALL'OFFSET--------------------------		
        if (this.dragging) {
                // Move the entire rectangle
                let widthd = this.rect[2] - this.rect[0];
                let heightd = this.rect[3] - this.rect[1];
                
                this.rect[0] = scaledX - offsetX;
                this.rect[1] = scaledY - offsetY;
                this.rect[2] = this.rect[0] + widthd;
                this.rect[3] = this.rect[1] + heightd;
        } else if (resizing) {	
            // Resize the rectangle based on selected corner
            if (selectedCorner === 'topLeft') {
                console.log("drag topLeft");
                this.rect[0] = scaledX;
                this.rect[1] = scaledY;
            } else if (selectedCorner === 'topRight') {
                console.log("drag topRight");
                this.rect[2] = scaledX;
                this.rect[1] = scaledY;
            } else if (selectedCorner === 'bottomLeft') {
                console.log("drag bottomLeft");
                this.rect[0] = scaledX;
                this.rect[3] = scaledY;
            } else if (selectedCorner === 'bottomRight') {
                this.rect[2] = scaledX;
                this.rect[3] = scaledY;
            }
            console.log("resize: "+scaledX+" - "+scaledY);
        }	
        if(this.rot){
            // passaggio del risultato nel riferimento ruotato
            this.region[0] = -this.rect[0];
            this.region[1] =  this.height - this.rect[1];
            this.region[2] =  -this.rect[2];
            this.region[3] =  this.height - this.rect[3];
        }else{
            // passaggio del risultato nel riferimento non ruotato
            this.region[0] = this.rect[0];
            this.region[1] = this.rect[1];
            this.region[2] = this.rect[2];
            this.region[3] = this.rect[3];
        }
    }

    mouseReleased() {
        this.dragging = false;
        this.resizing = false;
        this.selectedCorner = null;
        cursor(ARROW);
    }

    // Utility to check if mouse is near a corner for resizing
    isNearCorner(mx, my, x, y, threshold) {
        let d = dist(mx, my, x, y);
        console.log("Dist: "+d);
        return d  < threshold;
    }
}
/*
class MyCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');

        // Aggiungi i listener per gli eventi mousePressed e mouseReleased
        this.canvas.addEventListener('mousedown', this.mousePressed.bind(this));
        this.canvas.addEventListener('mouseup', this.mouseReleased.bind(this));
    }

    // Funzione per gestire il mousePressed
    mousePressed(event) {
        console.log("Mouse pressed at: ", event.clientX, event.clientY);
        // Aggiungi qui la logica per quando il mouse viene premuto
    }

    // Funzione per gestire il mouseReleased
    mouseReleased(event) {
        console.log("Mouse released at: ", event.clientX, event.clientY);
        // Aggiungi qui la logica per quando il mouse viene rilasciato
    }
}

// Utilizzo della classe
const myCanvasInstance = new MyCanvas('myCanvas');  // 'myCanvas' è l'ID dell'elemento canvas nel DOM

*/