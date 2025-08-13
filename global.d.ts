interface productRequest {
    id: number;
    name: string;
}

interface order{
    cartItems: string[];
    amount: string;
    status: string;
    createdAt: Date;
}

interface product {
    id: string;
    title: string;
    description: string;
    image: string;
    category: string | "Others";
    price: number;
}