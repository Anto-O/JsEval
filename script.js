const resName = "Reservation";
    const imgPath = "./img/";

    // Canva
    var canva;
    var ctx;

    // Récupération de la réservation
    var reservation = JSON.parse(localStorage.getItem(resName));
    var interval;

    // Création de la map
    let stations;
    var markers = [];
    const map = L.map('map').setView([45.764043, 4.835659], 13);
	var tiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		id: 'mapbox/streets-v11',
		tileSize: 512,
		zoomOffset: -1
	}).addTo(map);
    // Récupération de l'input pour la recherche
    const input = document.querySelector('#city');
    input.addEventListener('keyup', e=>{
        if(e.keyCode==13){
            ChangeCity();
        }
    });

    window.onload = ()=>{
        canva = document.querySelector("#canva");
        ctx = canva.getContext("2d");
        // Affiche la réservation
        showRes();

        document.querySelector("#clearCanvas").addEventListener("click",ClearCanvas);

        document.querySelector("#book").addEventListener("click",Book);

        document.querySelector("#searchCity").addEventListener("click",ChangeCity);

        // Ajoute les évenements de dessin au canva
        canva.addEventListener("mousedown",(e)=>{
            canva.addEventListener("mousemove",drawing,e);
            lx = e.pageX - canva.offsetLeft;
            ly = e.pageY - canva.offsetTop;
        });

        canva.addEventListener("mouseup",(e)=>{
            canva.removeEventListener("mousemove",drawing)
        });

        // Demande la position au démarrage
        navigator.geolocation.getCurrentPosition((r)=>{
            getCoords(r);
        });
    };

    

    // --- Canva | Début --- \\
    let lx=0;
    let ly=0;
    function drawing(e) {
        const x = e.pageX - canva.offsetLeft;
        const y = e.pageY - canva.offsetTop;

        ctx.lineWidth=5;
        ctx.strokeStyle = "hsl(0, 100%, 0%)";
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(lx,ly);
        ctx.lineTo(x,y);
        ctx.stroke();

        lx = x;
        ly = y;  
        
    }

    // --- Réinitialise le canva --- \\
    function ClearCanvas(){
        ctx.clearRect(0, 0, canva.width, canva.height);
    }
    // --- Canva | Fin --- \\


    // --- Fonction qui appelle l'api de jcdecaux et récupère les stations de la ville donné --- \\
    function SearchCity(cityName) {
        fetch(`https://api.jcdecaux.com/vls/v3/stations?contract=${cityName}&apiKey=dee1a99085af190d99b3ebd9b448222bdf23b493`)
        .then((res)=>{return res.json()})
        .then((res)=>{
            stations = res;
            try {
                GenerateMap();
            } catch (error) {
                showError("Cette ville est introuvable");
            }
        });
    }
    
    // --- Génére la map selon les stations --- \\
    function GenerateMap() {
        // --- Met la vu de la map sur la première station --- \\
        map.setView([stations[0].position.latitude,stations[0].position.longitude]);
        // --- Crée des marqueurs pour toute les stations --- \\
        stations.forEach(station => {
            var marker = L.marker([station.position.latitude,station.position.longitude]).addTo(map).on("click",()=>{ShowForm(station.number)});
            markers.push(marker);
        });
        
    }

    // --- Si on appuie sur la touche "Entrée", supprime tout les marqueur et appelle SearchCity --- \\
    function ChangeCity() {
        //if(e.keyCode==13){
            markers.forEach(marker => {
                marker.remove();
            });
            markers.length = 0;
            SearchCity(document.querySelector("#city").value.trim());
        //}
    }
    
    // --- Quand on clique sur une station, affiche le formulaire avec les informations relative à cette station --- \\
    function ShowForm(StationId) {
        document.querySelector("#formContainer").style.display="block";
        
        let currentStation = stations.find((s)=>s.number==StationId);
        let form = document.querySelector("#form");
        
        document.querySelector("#stationAdresse").innerText = currentStation.address=="" ? "Aucune adresse valable":currentStation.address;
        document.querySelector("#stationPlace").innerText = currentStation.mainStands.capacity;
        document.querySelector("#stationBikes").innerText = currentStation.mainStands.availabilities.bikes;
        document.querySelector("#stationId").value = StationId;
        // --- Si il n'y a plus de vélo disponible n'affiche pas le formulaire --- \\
        if(currentStation.mainStands.availabilities.bikes<=0){
            form.style.display = "none";
        }else{
            form.style.display = "block";
        }
    }
    
    // --- Enregistre une réservation --- \\
    function Book() {
        try {
            // --- Récupère le nom, le prénom et la signature --- \\
            let firstName = document.querySelector("#firstName").value;
            let lastName = document.querySelector("#lastName").value;
            let signature = canva.toDataURL("image/jpg");
            // --- Vérifie si le nom et le prénom ne sont pas vide --- \\
            if(firstName!="" && lastName!=""){
                // --- Récupère l'id de la station et la staion en elle même --- \\
                let stationId = document.querySelector("#stationId").value;
                let currentStation = stations.find((s)=>s.number==stationId);
                // --- Met le nom, le prénom, la signature, la station, la quantité et la date de réservation dans un objet --- \\
                let resObj = {
                    "firstName":firstName,
                    "lastName":lastName,
                    "station":currentStation,
                    "qte":1,
                    "date" : Date.now(),
                    "signature":signature,
                };
                // --- Stocke l'objet dans le local storage --- \\
                localStorage.setItem(resName,JSON.stringify(resObj));

                // --- Affiche une popup de success et affiche la réservation --- \\
                showSuccess("Votre réservation à bien été enregistré");
                showRes();
            }else{
                // --- Si un des deux est vide, affiche une erreur --- \\
                showError("Le nom et le prénom sont requis pour réserver");
            }
        } catch (error) {
            // --- Si il y a une autre erreur imprévue affiche une erreur --- \\
            showError("Impossible de réserver")
        }
    }

    // --- Affiche la réservation, sinon n'affiche rien --- \\
    function showRes() {
        let resSec = document.querySelector("#res");
        resSec.innerHTML = "";
        reservation = JSON.parse(localStorage.getItem(resName));
        if (reservation!=null) {
            let p = document.createElement("p");
            p.style.textAlign = "center"
            p.innerHTML = `Vélo réservé à la station ${reservation.station.name} par ${reservation.firstName} ${reservation.lastName} <br/> Temps restants : <span id="leftTime"></span>`;
            resSec.appendChild(p);
            
            let timeLeft = document.querySelector('#leftTime');
            
            let date = new Date(reservation.date);
            interval = setInterval(()=>{
                let now = new Date();
                
                let res = new Date(now.getTime()-date.getTime());
                let minuteDif = res.getMinutes()+(res.getHours()*60-60);
                let secondeDif = res.getSeconds();
                if(minuteDif>=20){
                    timeLeft.innerText = "Réservation passé";
                    clearInterval(interval);
                }else{
                    timeLeft.innerText = `${19-minuteDif} min ${60-secondeDif} sec`;
                }
            },1000);
        }

    }

    // --- Affiche une popup d'erreur avec le message donnée --- \\
    function showError(msg) {
        Swal.fire(
            "Une erreur est survenue",
            msg,
            "error"
        );
    }
    // --- Affiche une popup de succes avec le message donnée --- \\ 
    function showSuccess(msg) {
        Swal.fire(
            "Succès",
            msg,
            "success"
        );
    }

    // --- Si l'utilisateur a accepté la géolocalisation, reécupère sa ville à partir de sa latitude et de sa longitude --- \\
    function getCoords(r){
        fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${r.coords.latitude}&lon=${r.coords.longitude}&appid=fa956c3c094574e034c48dc970215933`)
        .then(res => res.json())
        .then((result) => {
            SearchCity(result[0].name);
        });
    }
    
    // --- Carousel | Début --- \\
    class Carousel{

        // --- Initialise le carousel dans containern avec les images fourni dans images --- \\
        constructor(images,container){
            this.images = images;
            this.carousel = document.querySelector(container);
            this.container = document.createElement("div");
            this.container.classList.add("container");
            
            this.toggleInterval();

            document.querySelector("html").addEventListener("keyup",(e)=>{
                if(e.keyCode==37){
                    this.slideLeft();
                }else if(e.keyCode==39){
                    this.slideRight();
                }
            });

            this.showCarousel();
        }

        // --- Si l'interval est en cours, l'arrête. Sinon le lance --- \\
        toggleInterval(){
            if(this.intervalState){
                this.intervalState=false;
                clearInterval(this.interval)
            }else{
                this.intervalState=true;
                this.interval = setInterval(()=>{
                    this.slideRight()
                },5000);
            }
        }

        // --- Slide vers la gauche --- \\
        slideLeft(){
            let temp = this.images.shift();
            this.images.push(temp);

            this.showCarousel();
        }

        // --- Slide vers la droite --- \\
        slideRight(){
            let temp = this.images.pop();
            this.images.unshift(temp);

            this.showCarousel();
        }

        // --- Affiche le carousel --- \\
        showCarousel(){
            // --- Réinitialise le contenu du carousel et du container des images --- \\
            this.carousel.innerHTML = "";
            this.container.innerHTML = "";
            this.carousel.appendChild(this.container);
            
            // --- Crée la fleche pour appeler slideLeft --- \\
            let leftSpan = document.createElement("span");
            leftSpan.classList.add("left");
            leftSpan.addEventListener("click",()=>{this.slideLeft()});
            this.carousel.appendChild(leftSpan);

            // --- Crée la fleche pour appeler slideRight --- \\
            let rightSpan = document.createElement("span");
            rightSpan.classList.add("right");
            rightSpan.addEventListener("click",()=>{this.slideRight()});
            this.carousel.appendChild(rightSpan);

            // --- Crée un bouton pour mettre en pause le carousel --- \\
            let button = document.createElement("button");
            button.innerHTML = "Pause";
            button.classList.add("pauseButton");
            button.addEventListener("click",()=>{this.toggleInterval()})
            this.carousel.appendChild(button);

            // --- Affiche la première image --- \\
            this.images.forEach((image,index) => {
                let img = document.createElement("img");
                img.src = imgPath+image;
                img.style.display = index==0?"block":"none";
                this.container.appendChild(img);
            });
        }
    }
    
    // --- Initialise un carousel --- \\
    const carousel = new Carousel(["velo1.jpg","velo2.jpg","velo3.jpg"],"#carousel");

    // --- Carousel | Fin --- \\