import CityForm from '../city-form';

export default function NewCityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New City</h1>
        <p className="text-muted-foreground mt-1">Create a new city destination</p>
      </div>
      <CityForm />
    </div>
  );
}
