"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Clock, Ticket } from "lucide-react";

const attractions = [
    { id: 1, name: "Cox's Bazar Beach", location: "Cox's Bazar, Chattogram", price: 0, rating: 4.8, duration: "Full day", category: "Beach", image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600" },
    { id: 2, name: "Sundarbans Mangrove Forest", location: "Khulna", price: 1500, rating: 4.9, duration: "2-3 days", category: "Nature", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600" },
    { id: 3, name: "Lalbagh Fort", location: "Old Dhaka, Dhaka", price: 20, rating: 4.6, duration: "1-2 hrs", category: "Heritage", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600" },
    { id: 4, name: "Sajek Valley", location: "Rangamati, Chattogram", price: 800, rating: 4.9, duration: "2 days", category: "Mountain", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600" },
    { id: 5, name: "Ahsan Manzil", location: "Old Dhaka, Dhaka", price: 25, rating: 4.5, duration: "1-2 hrs", category: "Heritage", image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600" },
    { id: 6, name: "Sixty Dome Mosque", location: "Bagerhat, Khulna", price: 30, rating: 4.7, duration: "1-2 hrs", category: "Heritage", image: "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=600" },
    { id: 7, name: "Saint Martin's Island", location: "Cox's Bazar, Chattogram", price: 1200, rating: 4.8, duration: "1-2 days", category: "Beach", image: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=600" },
    { id: 8, name: "Ratargul Swamp Forest", location: "Sylhet", price: 500, rating: 4.6, duration: "Half day", category: "Nature", image: "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?w=600" },
    { id: 9, name: "Jaflong", location: "Sylhet", price: 600, rating: 4.7, duration: "Full day", category: "Nature", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600" },
];


const Attractions = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Explore <span className="text-gradient">Attractions</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Discover iconic landmarks, hidden gems, and unforgettable experiences worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attractions.map((a, i) => (
              <Card
                key={a.id}
                className="overflow-hidden hover-lift group animate-fade-in-up"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={a.image}
                    alt={a.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 glass px-3 py-1 rounded-full text-xs font-medium">
                    {a.category}
                  </div>
                  <div className="absolute top-3 right-3 glass px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" /> {a.rating}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="text-lg font-bold mb-1">{a.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                    <MapPin className="h-3.5 w-3.5" /> {a.location}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.duration}</span>
                    <span className="flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> {a.price === 0 ? "Free" : `$${a.price}`}</span>
                  </div>
                  <Button variant="default" size="sm" className="w-full">View Details</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

    </div>
  );
};

export default Attractions;
